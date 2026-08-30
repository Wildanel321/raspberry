"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = void 0;
class MockProvider {
    // In-memory state for mocks
    services = [
        { name: 'nginx', description: 'Nginx HTTP Server', status: 'running', enabled: true, active: true },
        { name: 'ssh', description: 'OpenSSH Server Daemon', status: 'running', enabled: true, active: true },
        { name: 'docker', description: 'Docker Application Container Engine', status: 'running', enabled: true, active: true },
        { name: 'bluetooth', description: 'Bluetooth Service', status: 'stopped', enabled: false, active: false },
        { name: 'NetworkManager', description: 'Network Manager', status: 'running', enabled: true, active: true },
        { name: 'picontrol-agent', description: 'PiControl Agent Service', status: 'running', enabled: true, active: true }
    ];
    dockerContainers = [
        { id: 'd1a2b3c4e5f6', name: 'pihole', status: 'running', image: 'pihole/pihole:latest', cpu: 1.2, memory: 45000000, networkRx: 15400000, networkTx: 1200000, uptime: 'Up 3 days', ports: '80/tcp, 53/udp' },
        { id: 'f7e6d5c4b3a2', name: 'homeassistant', status: 'running', image: 'homeassistant/home-assistant:stable', cpu: 4.8, memory: 180000000, networkRx: 8900000, networkTx: 2400000, uptime: 'Up 1 day', ports: '8123/tcp' },
        { id: 'a1c2e3g4i5k6', name: 'nodered', status: 'running', image: 'nodered/node-red:latest', cpu: 2.1, memory: 85000000, networkRx: 450000, networkTx: 890000, uptime: 'Up 12 hours', ports: '1880/tcp' },
        { id: 'z9y8x7w6v5u4', name: 'portainer', status: 'stopped', image: 'portainer/portainer-ce:latest', cpu: 0, memory: 0, networkRx: 0, networkTx: 0, uptime: 'Exited (0) 5 hours ago', ports: '9000/tcp' }
    ];
    processes = [
        { pid: 1, name: 'systemd', cpu: 0.1, mem: 0.8, user: 'root', status: 'S', started: 'Aug 27' },
        { pid: 843, name: 'sshd', cpu: 0.0, mem: 0.6, user: 'root', status: 'S', started: 'Aug 27' },
        { pid: 902, name: 'nginx', cpu: 0.2, mem: 1.2, user: 'www-data', status: 'S', started: 'Aug 27' },
        { pid: 1045, name: 'dockerd', cpu: 1.5, mem: 4.2, user: 'root', status: 'S', started: 'Aug 27' },
        { pid: 1205, name: 'node', cpu: 2.5, mem: 8.5, user: 'picontrol', status: 'R', started: '19:25' },
        { pid: 1482, name: 'bash', cpu: 0.0, mem: 0.4, user: 'pi', status: 'S', started: '19:25' },
        { pid: 1530, name: 'htop', cpu: 1.8, mem: 0.9, user: 'pi', status: 'R', started: '19:28' },
        { pid: 1610, name: 'kthreadd', cpu: 0.0, mem: 0.0, user: 'root', status: 'S', started: 'Aug 27' },
        { pid: 1821, name: 'dbus-daemon', cpu: 0.1, mem: 0.5, user: 'messagebus', status: 'S', started: 'Aug 27' }
    ];
    gpioPins = [];
    packagesList = {
        installedCount: 924,
        updatesAvailable: [
            { packageName: 'openssl', installedVersion: '3.0.11-1~deb12u1', candidateVersion: '3.0.13-1~deb12u1' },
            { packageName: 'curl', installedVersion: '7.88.1-10+deb12u5', candidateVersion: '7.88.1-10+deb12u6' },
            { packageName: 'git', installedVersion: '1:2.39.2-1.1', candidateVersion: '1:2.39.2-1.1+deb12u1' },
            { packageName: 'systemd', installedVersion: '252.19-1~deb12u1', candidateVersion: '252.22-1~deb12u1' }
        ]
    };
    displayState = {
        connected: true,
        resolution: '1920x1080',
        refreshRate: 60,
        displayServer: 'X11',
        orientation: 'normal',
        screenStatus: 'on'
    };
    constructor() {
        this.initializeGPIOState();
    }
    initializeGPIOState() {
        const layout = [
            { pin: 1, gpio: null, name: '3.3V Power', type: 'power' },
            { pin: 2, gpio: null, name: '5V Power', type: 'power' },
            { pin: 3, gpio: 2, name: 'GPIO 2 (SDA)', type: 'gpio' },
            { pin: 4, gpio: null, name: '5V Power', type: 'power' },
            { pin: 5, gpio: 3, name: 'GPIO 3 (SCL)', type: 'gpio' },
            { pin: 6, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 7, gpio: 4, name: 'GPIO 4 (GPCLK0)', type: 'gpio' },
            { pin: 8, gpio: 14, name: 'GPIO 14 (TXD)', type: 'gpio' },
            { pin: 9, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 10, gpio: 15, name: 'GPIO 15 (RXD)', type: 'gpio' },
            { pin: 11, gpio: 17, name: 'GPIO 17', type: 'gpio' },
            { pin: 12, gpio: 18, name: 'GPIO 18 (PWM0)', type: 'gpio' },
            { pin: 13, gpio: 27, name: 'GPIO 27', type: 'gpio' },
            { pin: 14, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 15, gpio: 22, name: 'GPIO 22', type: 'gpio' },
            { pin: 16, gpio: 23, name: 'GPIO 23', type: 'gpio' },
            { pin: 17, gpio: null, name: '3.3V Power', type: 'power' },
            { pin: 18, gpio: 24, name: 'GPIO 24', type: 'gpio' },
            { pin: 19, gpio: 10, name: 'GPIO 10 (MOSI)', type: 'gpio' },
            { pin: 20, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 21, gpio: 9, name: 'GPIO 9 (MISO)', type: 'gpio' },
            { pin: 22, gpio: 25, name: 'GPIO 25', type: 'gpio' },
            { pin: 23, gpio: 11, name: 'GPIO 11 (SCLK)', type: 'gpio' },
            { pin: 24, gpio: 8, name: 'GPIO 8 (CE0)', type: 'gpio' },
            { pin: 25, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 26, gpio: 7, name: 'GPIO 7 (CE1)', type: 'gpio' },
            { pin: 27, gpio: 0, name: 'GPIO 0 (ID_SD)', type: 'special' },
            { pin: 28, gpio: 1, name: 'GPIO 1 (ID_SC)', type: 'special' },
            { pin: 29, gpio: 5, name: 'GPIO 5', type: 'gpio' },
            { pin: 30, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 31, gpio: 6, name: 'GPIO 6', type: 'gpio' },
            { pin: 32, gpio: 12, name: 'GPIO 12 (PWM0)', type: 'gpio' },
            { pin: 33, gpio: 13, name: 'GPIO 13 (PWM1)', type: 'gpio' },
            { pin: 34, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 35, gpio: 19, name: 'GPIO 19 (MISO)', type: 'gpio' },
            { pin: 36, gpio: 16, name: 'GPIO 16', type: 'gpio' },
            { pin: 37, gpio: 26, name: 'GPIO 26', type: 'gpio' },
            { pin: 38, gpio: 20, name: 'GPIO 20 (MOSI)', type: 'gpio' },
            { pin: 39, gpio: null, name: 'Ground', type: 'ground' },
            { pin: 40, gpio: 21, name: 'GPIO 21 (SCLK)', type: 'gpio' }
        ];
        this.gpioPins = layout.map(l => ({
            physicalPin: l.pin,
            gpioPin: l.gpio,
            name: l.name,
            type: l.type,
            ...(l.type === 'gpio' ? { mode: 'in', value: 0 } : {})
        }));
    }
    async getSystemInfo() {
        return {
            hostname: 'picontrol-dev',
            os: 'Debian GNU/Linux 12 (bookworm) - Dev Mock Mode',
            kernel: '6.1.21-v8+ (mock)',
            uptime: Math.floor(process.uptime()) + 148200, // mock continuous uptime
            arch: 'aarch64',
            model: 'Raspberry Pi 3 Model B Plus Rev 1.3',
            firmware: 'Mar 17 2023 10:50:39 (vc-git-789a1c2)',
            dateTime: new Date().toISOString(),
            bootTime: new Date(Date.now() - (process.uptime() + 148200) * 1000).toISOString()
        };
    }
    async getCPUStatus() {
        // Generate organic shifting numbers
        const time = Date.now() / 10000;
        const usage = Math.round((Math.sin(time) * 20 + 35) + (Math.random() * 5));
        const load1 = parseFloat((Math.sin(time * 0.5) * 0.4 + 0.6).toFixed(2));
        const load5 = parseFloat((Math.sin(time * 0.2) * 0.3 + 0.5).toFixed(2));
        const load15 = parseFloat((Math.sin(time * 0.1) * 0.2 + 0.4).toFixed(2));
        const temperature = parseFloat(((Math.sin(time * 0.8) * 4) + 48.5 + (Math.random() * 0.5)).toFixed(1));
        return {
            usage,
            loadAverage: [load1, load5, load15],
            temperature,
            frequency: 1400, // MHz
            cores: 4,
            throttled: '0x0' // 0x0 means normal, no throttling
        };
    }
    async getRAMStatus() {
        const total = 968000000; // ~1GB in bytes
        const time = Date.now() / 15000;
        const used = Math.round(total * (0.42 + Math.sin(time) * 0.05));
        const cached = Math.round(total * 0.25);
        const available = total - used;
        return {
            total,
            used,
            available,
            cached,
            swapTotal: 104853000,
            swapUsed: 1250000
        };
    }
    async getStorageStatus() {
        return [
            {
                filesystem: '/dev/root',
                mountPoint: '/',
                total: 31200000000, // ~32GB
                used: 14200000000,
                free: 17000000000,
                usePercent: 46
            },
            {
                filesystem: '/dev/mmcblk0p1',
                mountPoint: '/boot',
                total: 512000000,
                used: 65000000,
                free: 447000000,
                usePercent: 13
            }
        ];
    }
    async getNetworkStatus() {
        const time = Date.now() / 5000;
        const downloadSpeed = Math.round((Math.sin(time) * 200000 + 400000) * (Math.random() * 0.4 + 0.8));
        const uploadSpeed = Math.round((Math.sin(time * 1.5) * 50000 + 80000) * (Math.random() * 0.4 + 0.8));
        return {
            interfaces: [
                {
                    name: 'eth0',
                    ip: '192.168.1.145',
                    mac: 'b8:27:eb:11:22:33',
                    rxBytes: 541000000,
                    txBytes: 89000000,
                    type: 'ethernet'
                },
                {
                    name: 'wlan0',
                    ip: '192.168.1.146',
                    mac: 'b8:27:eb:44:55:66',
                    rxBytes: 125000000,
                    txBytes: 12000000,
                    type: 'wifi',
                    signalStrength: 78,
                    ssid: 'MyHomeWiFi'
                },
                {
                    name: 'lo',
                    ip: '127.0.0.1',
                    mac: '00:00:00:00:00:00',
                    rxBytes: 5000000,
                    txBytes: 5000000,
                    type: 'loopback'
                }
            ],
            downloadSpeed,
            uploadSpeed,
            totalDownload: 666000000,
            totalUpload: 101000000,
            internetConnected: true
        };
    }
    async getProcesses() {
        // Return processes list with slight CPU/Memory changes
        return this.processes.map(p => {
            if (p.name === 'node' || p.name === 'htop') {
                const factor = Math.random() > 0.5 ? 1 : -1;
                return {
                    ...p,
                    cpu: Math.max(0.1, parseFloat((p.cpu + Math.random() * 0.5 * factor).toFixed(1)))
                };
            }
            return p;
        });
    }
    async killProcess(pid) {
        const idx = this.processes.findIndex(p => p.pid === pid);
        if (idx !== -1) {
            this.processes.splice(idx, 1);
            return true;
        }
        return false;
    }
    async getServices() {
        return this.services;
    }
    async controlService(name, action) {
        const idx = this.services.findIndex(s => s.name === name);
        if (idx === -1)
            return false;
        if (action === 'start') {
            this.services[idx].status = 'running';
            this.services[idx].active = true;
        }
        else if (action === 'stop') {
            this.services[idx].status = 'stopped';
            this.services[idx].active = false;
        }
        else if (action === 'restart') {
            this.services[idx].status = 'running';
            this.services[idx].active = true;
        }
        else if (action === 'enable') {
            this.services[idx].enabled = true;
        }
        else if (action === 'disable') {
            this.services[idx].enabled = false;
        }
        return true;
    }
    async getDockerStatus() {
        return {
            installed: true,
            containers: this.dockerContainers
        };
    }
    async controlDockerContainer(id, action) {
        const idx = this.dockerContainers.findIndex(c => c.id === id);
        if (idx === -1)
            return false;
        if (action === 'start') {
            this.dockerContainers[idx].status = 'running';
            this.dockerContainers[idx].uptime = 'Up Just now';
            this.dockerContainers[idx].cpu = 1.0;
            this.dockerContainers[idx].memory = 25000000;
        }
        else if (action === 'stop') {
            this.dockerContainers[idx].status = 'stopped';
            this.dockerContainers[idx].uptime = 'Exited (0) Just now';
            this.dockerContainers[idx].cpu = 0;
            this.dockerContainers[idx].memory = 0;
        }
        else if (action === 'restart') {
            this.dockerContainers[idx].status = 'running';
            this.dockerContainers[idx].uptime = 'Up Just now';
            this.dockerContainers[idx].cpu = 1.5;
        }
        return true;
    }
    async getDockerContainerLogs(id) {
        const container = this.dockerContainers.find(c => c.id === id);
        if (!container)
            return 'Container not found';
        const timestamp = new Date().toISOString();
        return `[${timestamp}] Starting ${container.name} container daemon...
[${timestamp}] Loaded environment parameters successfully
[${timestamp}] Connecting to network interfaces...
[${timestamp}] Server is listening on internal port bindings
[${timestamp}] Sync check complete. Initialization sequence done.
[${timestamp}] Listening for inbound connections...`;
    }
    async getGPIOStatus() {
        return this.gpioPins;
    }
    async toggleGPIO(pin, value) {
        const idx = this.gpioPins.findIndex(g => g.physicalPin === pin);
        if (idx !== -1 && this.gpioPins[idx].type === 'gpio') {
            this.gpioPins[idx].value = value;
            return true;
        }
        return false;
    }
    async setGPIOMode(pin, mode) {
        const idx = this.gpioPins.findIndex(g => g.physicalPin === pin);
        if (idx !== -1 && this.gpioPins[idx].type === 'gpio') {
            this.gpioPins[idx].mode = mode;
            return true;
        }
        return false;
    }
    async getDisplayStatus() {
        return this.displayState;
    }
    async getSecurityStatus() {
        return {
            sshEnabled: true,
            sshPasswordAuth: true,
            firewallActive: false,
            openPorts: [22, 80, 443, 3000],
            failedLoginsCount: 12,
            activeSessions: ['pi@pts/0 (192.168.1.100)', 'picontrol@server (localhost)'],
            recommendations: [
                'WARNING: SSH Password Authentication is enabled. Consider using SSH Keys and disabling password authentication.',
                'IMPORTANT: Default password of user "admin" is unchanged. Reset it immediately in settings.',
                'CAUTION: Firewall is inactive. Enable ufw or iptables to secure ports.',
                '4 outdated packages are available for upgrade. Run apt upgrade.'
            ]
        };
    }
    async getPackages() {
        return this.packagesList;
    }
    async runPackageAction(action, pkgName) {
        const timestamp = new Date().toLocaleTimeString();
        if (action === 'update') {
            return `[${timestamp}] $ sudo apt-get update
Hit:1 http://deb.debian.org/debian bookworm InRelease
Hit:2 http://archive.raspberrypi.org/debian bookworm InRelease
Reading package lists... Done`;
        }
        if (action === 'upgrade') {
            const updated = this.packagesList.updatesAvailable.map(p => p.packageName).join(', ');
            this.packagesList.updatesAvailable = [];
            return `[${timestamp}] $ sudo apt-get upgrade -y
Reading package lists... Done
Building dependency tree... Done
Calculating upgrade... Done
The following packages will be upgraded: ${updated}
4 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
Need to get 2,450 kB of archives.
After this operation, 102 kB of additional disk space will be used.
Retrieving updates...
Preparing packages...
Unpacking replacements...
Setting up upgraded packages...
Upgrade process completed successfully.`;
        }
        if (action === 'install' && pkgName) {
            this.packagesList.installedCount++;
            return `[${timestamp}] $ sudo apt-get install -y ${pkgName}
Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  ${pkgName}
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 150 kB of archives.
Unpacking ${pkgName}...
Setting up ${pkgName}...
Installation successful.`;
        }
        if (action === 'remove' && pkgName) {
            this.packagesList.installedCount = Math.max(0, this.packagesList.installedCount - 1);
            return `[${timestamp}] $ sudo apt-get remove -y ${pkgName}
Reading package lists... Done
Building dependency tree... Done
The following packages will be REMOVED:
  ${pkgName}
0 upgraded, 0 newly installed, 1 to remove and 0 not upgraded.
Removing ${pkgName}...
Purging configuration files...
Removal completed.`;
        }
        return 'Invalid package action';
    }
    async getLogs(type, query, limit = 100) {
        const mockLogs = [];
        const date = new Date();
        for (let i = 0; i < limit; i++) {
            date.setSeconds(date.getSeconds() - (limit - i) * 10);
            const timeStr = date.toISOString().replace('T', ' ').substring(0, 19);
            if (type === 'dmesg') {
                mockLogs.push(`[   ${(i * 12.3).toFixed(6)}] sd 0:0:0:0: [sda] Attached SCSI removable disk
[   ${(i * 12.5).toFixed(6)}] EXT4-fs (mmcblk0p2): re-mounted. Opts: (null). Quota mode: none.
[   ${(i * 13.1).toFixed(6)}] IPv6: ADDRCONF(NETDEV_CHANGE): wlan0: link becomes ready`);
            }
            else if (type === 'journal') {
                mockLogs.push(`${timeStr} picontrol systemd[1]: Started PiControl Dashboard Server Agent.
${timeStr} picontrol nginx[902]: 192.168.1.100 - - [${timeStr}] "GET /api/system HTTP/1.1" 200 450
${timeStr} picontrol sshd[1843]: Connection closed by authenticating user pi 192.168.1.102 port 49582 [preauth]`);
            }
            else {
                mockLogs.push(`${timeStr} picontrol-dev rsyslogd: [origin software="rsyslogd" swVersion="8.2302.0"] daemon startup
${timeStr} picontrol-dev cron[650]: (CRON) INFO (pidof cron is running)
${timeStr} picontrol-dev dbus-daemon[1821]: [system] Successfully activated service 'org.freedesktop.PolicyKit1'`);
            }
        }
        let joined = mockLogs.join('\n');
        if (query) {
            const q = query.toLowerCase();
            joined = joined.split('\n').filter(line => line.toLowerCase().includes(q)).join('\n');
        }
        return joined;
    }
}
exports.MockProvider = MockProvider;
