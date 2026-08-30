import express, { Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { CONFIG } from './config';
import { db, initializeDatabase, logAudit } from './db';
import { authMiddleware, signToken, AuthRequest } from './middleware/auth';
import { MockProvider } from './providers/MockProvider';
import { RaspberryPiProvider } from './providers/RaspberryPiProvider';
import { ISystemProvider } from './providers/ISystemProvider';
import { telemetryTracker } from './telemetry';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(cors());
app.use(express.json({ limit: '50mb' })); // support file uploads via JSON base64

// Determine System Provider (Mock on Win32/MacOS, RPi on Linux)
const isLinux = process.platform === 'linux';
const system: ISystemProvider = isLinux ? new RaspberryPiProvider() : new MockProvider();

console.log(`System Provider initialized: ${isLinux ? 'RaspberryPiProvider (Linux)' : 'MockProvider (Dev Mode)'}`);

// Resolve safe path helper for file manager
function resolveSafePath(userPath: string): { success: boolean; resolvedPath: string; error?: string } {
  const safeRoot = path.resolve(CONFIG.SAFE_DIR);
  // Clean path
  const normalizedUserPath = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const resolved = path.resolve(path.join(safeRoot, normalizedUserPath));
  
  if (!resolved.startsWith(safeRoot)) {
    return { success: false, resolvedPath: '', error: 'Access Denied: Path Traversal Detected' };
  }
  return { success: true, resolvedPath: resolved };
}

// ----------------------------------------------------
// Telemetry Polling Loop
// ----------------------------------------------------
let lastAlertTime = 0;
const alertCoolDown = 60000; // 1 minute alert cooldown

async function pollTelemetry() {
  try {
    const cpu = await system.getCPUStatus();
    const ram = await system.getRAMStatus();
    const storage = await system.getStorageStatus();
    const net = await system.getNetworkStatus();

    // RAM usage percentage
    const ramUsagePercent = ram.total > 0 ? Math.round((ram.used / ram.total) * 100) : 0;
    // Disk usage percentage (find max partition usage)
    const maxDiskPercent = storage.length > 0 ? Math.max(...storage.map(s => s.usePercent)) : 0;

    // Add to telemetry rolling history
    telemetryTracker.addPoint(
      cpu.usage,
      ramUsagePercent,
      cpu.temperature,
      net.downloadSpeed,
      net.uploadSpeed
    );

    const metricsPayload = {
      type: 'metrics',
      timestamp: new Date().toISOString(),
      cpu,
      ram: {
        total: ram.total,
        used: ram.used,
        available: ram.available,
        cached: ram.cached,
        usePercent: ramUsagePercent,
        swapTotal: ram.swapTotal,
        swapUsed: ram.swapUsed
      },
      storage,
      network: net
    };

    // Check thresholds and push notifications to SQLite (with rate limiting)
    const now = Date.now();
    if (now - lastAlertTime > alertCoolDown) {
      let triggered = false;
      if (cpu.usage > CONFIG.CPU_THRESHOLD) {
        await db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`CPU usage is high: ${cpu.usage}%`, 'warning']);
        triggered = true;
      }
      if (ramUsagePercent > CONFIG.RAM_THRESHOLD) {
        await db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`RAM usage is high: ${ramUsagePercent}%`, 'warning']);
        triggered = true;
      }
      if (cpu.temperature > CONFIG.TEMP_THRESHOLD) {
        const level = cpu.temperature > 80 ? 'critical' : 'warning';
        await db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`CPU temperature is high: ${cpu.temperature}°C`, level]);
        triggered = true;
      }
      if (maxDiskPercent > CONFIG.DISK_THRESHOLD) {
        await db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`Storage partition is almost full: ${maxDiskPercent}%`, 'warning']);
        triggered = true;
      }
      if (triggered) {
        lastAlertTime = now;
      }
    }

    // Broadcast to WebSocket clients
    const dataString = JSON.stringify(metricsPayload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(dataString);
      }
    });
  } catch (error) {
    console.error('Error in telemetry poll:', error);
  }
}

// Start polling
setInterval(pollTelemetry, CONFIG.MONITOR_INTERVAL);

// ----------------------------------------------------
// WebSocket Server Handshake
// ----------------------------------------------------
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send immediate history range structure on connection
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to PiControl real-time stats stream'
  }));

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// ----------------------------------------------------
// REST APIs Routing
// ----------------------------------------------------

// 1. Auth Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  try {
    const user = await db.get<{ id: number; username: string; password_hash: string; role: string }>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Record failed attempt
      await db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [
        `Failed login attempt for username: ${username}`,
        'warning'
      ]);
      return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role });
    await logAudit(username, 'LOGIN', 'Successful user login');

    res.json({ success: true, token, user: { username: user.username, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Old and new passwords are required' });
  }

  try {
    const username = req.user!.username;
    const user = await db.get<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (!user || !(await bcrypt.compare(oldPassword, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Incorrect old password' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    await logAudit(username, 'CHANGE_PASSWORD', 'Successfully updated account password');

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Metrics History
app.get('/api/metrics/history', (req, res) => {
  const range = (req.query.range as string) || '1m';
  const history = telemetryTracker.getHistory(range);
  res.json({ success: true, range, history });
});

// 3. System Info
app.get('/api/system', async (req, res) => {
  try {
    const info = await system.getSystemInfo();
    res.json({ success: true, info });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Processes
app.get('/api/processes', authMiddleware, async (req, res) => {
  try {
    const list = await system.getProcesses();
    res.json({ success: true, processes: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/processes/kill', authMiddleware, async (req: AuthRequest, res) => {
  const { pid } = req.body;
  if (!pid) return res.status(400).json({ success: false, error: 'PID is required' });

  try {
    const success = await system.killProcess(pid);
    await logAudit(req.user!.username, 'KILL_PROCESS', `Sent kill signal to PID ${pid}`);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Services
app.get('/api/services', authMiddleware, async (req, res) => {
  try {
    const list = await system.getServices();
    res.json({ success: true, services: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/services/control', authMiddleware, async (req: AuthRequest, res) => {
  const { name, action } = req.body;
  if (!name || !action) return res.status(400).json({ success: false, error: 'Service name and action are required' });

  try {
    const success = await system.controlService(name, action);
    await logAudit(req.user!.username, 'CONTROL_SERVICE', `Executed service action "${action}" on "${name}"`);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Docker
app.get('/api/docker', authMiddleware, async (req, res) => {
  try {
    const status = await system.getDockerStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/docker/control', authMiddleware, async (req: AuthRequest, res) => {
  const { id, action } = req.body;
  if (!id || !action) return res.status(400).json({ success: false, error: 'Container ID and action are required' });

  try {
    const success = await system.controlDockerContainer(id, action);
    await logAudit(req.user!.username, 'CONTROL_DOCKER', `Executed container action "${action}" on container ID "${id}"`);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/docker/logs', authMiddleware, async (req, res) => {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({ success: false, error: 'Container ID is required' });

  try {
    const logs = await system.getDockerContainerLogs(id);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GPIO
app.get('/api/gpio', authMiddleware, async (req, res) => {
  try {
    const status = await system.getGPIOStatus();
    res.json({ success: true, gpio: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gpio/toggle', authMiddleware, async (req: AuthRequest, res) => {
  const { pin, value } = req.body;
  if (pin === undefined || value === undefined) {
    return res.status(400).json({ success: false, error: 'Physical Pin number and Value (0 or 1) are required' });
  }

  try {
    const success = await system.toggleGPIO(pin, value);
    await logAudit(req.user!.username, 'TOGGLE_GPIO', `Toggled GPIO physical pin ${pin} to value ${value}`);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gpio/mode', authMiddleware, async (req: AuthRequest, res) => {
  const { pin, mode } = req.body;
  if (pin === undefined || !mode) {
    return res.status(400).json({ success: false, error: 'Physical Pin number and Mode ("in" or "out") are required' });
  }

  try {
    const success = await system.setGPIOMode(pin, mode);
    await logAudit(req.user!.username, 'SET_GPIO_MODE', `Set GPIO physical pin ${pin} mode to "${mode}"`);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Display
app.get('/api/display', authMiddleware, async (req, res) => {
  try {
    const status = await system.getDisplayStatus();
    res.json({ success: true, display: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Security
app.get('/api/security', authMiddleware, async (req, res) => {
  try {
    const status = await system.getSecurityStatus();
    res.json({ success: true, security: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Packages
app.get('/api/packages', authMiddleware, async (req, res) => {
  try {
    const status = await system.getPackages();
    res.json({ success: true, packages: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/packages/action', authMiddleware, async (req: AuthRequest, res) => {
  const { action, packageName } = req.body;
  if (!action) return res.status(400).json({ success: false, error: 'Package action is required' });

  // Escape package name to prevent execution shell injection
  if (packageName && !/^[a-zA-Z0-9.\-_+:=]+$/.test(packageName)) {
    return res.status(400).json({ success: false, error: 'Unsafe package name characters' });
  }

  try {
    await logAudit(req.user!.username, 'PACKAGE_ACTION', `Ran package action "${action}" ${packageName ? 'on ' + packageName : ''}`);
    const output = await system.runPackageAction(action, packageName);
    res.json({ success: true, output });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Logs
app.get('/api/logs', authMiddleware, async (req, res) => {
  const type = (req.query.type as 'journal' | 'dmesg' | 'syslog') || 'journal';
  const query = req.query.query as string;
  const limit = parseInt(req.query.limit as string, 10) || 100;

  try {
    const output = await system.getLogs(type, query, limit);
    res.json({ success: true, logs: output });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. File Manager (Traversal Protected)
app.get('/api/files', authMiddleware, (req, res) => {
  const reqPath = (req.query.path as string) || '';
  const result = resolveSafePath(reqPath);
  if (!result.success) {
    return res.status(403).json({ success: false, error: result.error });
  }

  try {
    const files = fs.readdirSync(result.resolvedPath);
    const details = files.map((file) => {
      const fullPath = path.join(result.resolvedPath, file);
      const stat = fs.statSync(fullPath);
      return {
        name: file,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtime.toISOString(),
        permissions: '0' + (stat.mode & 0o777).toString(8)
      };
    });
    res.json({ success: true, files: details, currentPath: path.relative(CONFIG.SAFE_DIR, result.resolvedPath) || '/' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/files/create', authMiddleware, (req, res) => {
  const { path: reqPath, folderName } = req.body;
  if (!folderName) return res.status(400).json({ success: false, error: 'Folder name is required' });

  // Escape dangerous folder names
  if (folderName.includes('/') || folderName.includes('\\') || folderName.includes('..')) {
    return res.status(400).json({ success: false, error: 'Invalid folder name' });
  }

  const result = resolveSafePath(reqPath || '');
  if (!result.success) {
    return res.status(403).json({ success: false, error: result.error });
  }

  try {
    const newFolderPath = path.join(result.resolvedPath, folderName);
    fs.mkdirSync(newFolderPath);
    res.json({ success: true, message: 'Folder created successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/files/upload', authMiddleware, (req, res) => {
  const { path: reqPath, filename, content } = req.body; // content is base64 string
  if (!filename || !content) return res.status(400).json({ success: false, error: 'Filename and base64 content are required' });

  const result = resolveSafePath(reqPath || '');
  if (!result.success) {
    return res.status(403).json({ success: false, error: result.error });
  }

  try {
    const targetFilePath = path.join(result.resolvedPath, filename);
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(targetFilePath, buffer);
    res.json({ success: true, message: 'File uploaded successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/download', authMiddleware, (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ success: false, error: 'File path is required' });

  const result = resolveSafePath(filePath);
  if (!result.success) {
    return res.status(403).json({ success: false, error: result.error });
  }

  if (!fs.existsSync(result.resolvedPath) || fs.statSync(result.resolvedPath).isDirectory()) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  res.sendFile(result.resolvedPath);
});

app.post('/api/files/rename', authMiddleware, (req, res) => {
  const { path: folderPath, oldName, newName } = req.body;
  if (!oldName || !newName) return res.status(400).json({ success: false, error: 'Old name and new name are required' });

  // Prevent parent traversal in filename itself
  if (newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
    return res.status(400).json({ success: false, error: 'Invalid file name' });
  }

  const result = resolveSafePath(folderPath || '');
  if (!result.success) {
    return res.status(403).json({ success: false, error: result.error });
  }

  try {
    const oldPath = path.join(result.resolvedPath, oldName);
    const newPath = path.join(result.resolvedPath, newName);
    
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ success: false, error: 'Source file does not exist' });
    }
    
    fs.renameSync(oldPath, newPath);
    res.json({ success: true, message: 'Item renamed successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Terminal Allowlist Runner
app.post('/api/terminal/exec', authMiddleware, async (req: AuthRequest, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ success: false, error: 'Command string is required' });

  const username = req.user!.username;

  // 1. Strict input characters whitelist to block chaining/injections
  if (/[;&|$`><\n\r()]/g.test(command)) {
    await logAudit(username, 'TERMINAL_REJECTED', `Rejected malicious input: "${command}"`);
    return res.status(403).json({ success: false, error: 'Access Denied: Unsafe characters detected.' });
  }

  // 2. Parse command arguments
  const args = command.trim().split(/\s+/);
  const baseCmd = args[0];
  const allowedBase = ['uptime', 'uname', 'df', 'free', 'lsblk', 'ip', 'ss', 'systemctl', 'journalctl', 'ping', 'host', 'traceroute', 'route'];
  if (!allowedBase.includes(baseCmd)) {
    return res.status(403).json({ success: false, error: `Access Denied: Base command "${baseCmd}" is not allowed.` });
  }  // 3. For systemctl and journalctl, we only allow status / viewing operations
  if (baseCmd === 'systemctl') {
    const action = args[1];
    if (action && action !== 'status') {
      return res.status(403).json({ success: false, error: `Access Denied: "systemctl" is limited to "status" queries in the terminal.` });
    }
  }

  // Log in Audit Log
  await logAudit(username, 'TERMINAL_EXEC', `Ran command: "${command}"`);

  // 4. Exec safely
  // Prefix journalctl, systemctl, etc. with sudo if on Pi and we want access to all logs,
  // but to keep it simple, we run command exactly as typed. Since picontrol is passwordless for systemctl, it will work.
  exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
    res.json({
      success: true,
      output: (stdout + stderr).trim() || '(No output)'
    });
  });
});

// 14. Notifications API
app.get('/api/notifications', authMiddleware, async (req, res) => {
  try {
    const list = await db.all('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50');
    res.json({ success: true, notifications: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/notifications/dismiss', authMiddleware, async (req, res) => {
  const { id } = req.body;
  try {
    if (id) {
      await db.run('UPDATE notifications SET dismissed = 1 WHERE id = ?', [id]);
    } else {
      await db.run('UPDATE notifications SET dismissed = 1');
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. Audit Logs
app.get('/api/audit-logs', authMiddleware, async (req, res) => {
  try {
    const list = await db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
    res.json({ success: true, auditLogs: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 16. Layout & Settings API
app.get('/api/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const layoutRow = await db.get<{ layout_json: string }>(
      'SELECT layout_json FROM dashboard_layout WHERE username = ?',
      [req.user!.username]
    );

    // Fetch notifications settings thresholds or other metadata
    const dbSettings = await db.all<{ key: string; value: string }>('SELECT * FROM settings');
    const settingsMap: Record<string, string> = {};
    dbSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json({
      success: true,
      layout: layoutRow ? JSON.parse(layoutRow.layout_json) : null,
      settings: settingsMap
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', authMiddleware, async (req: AuthRequest, res) => {
  const { layout, settings } = req.body;
  const username = req.user!.username;

  try {
    if (layout) {
      await db.run(
        `INSERT INTO dashboard_layout (username, layout_json, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(username) DO UPDATE SET layout_json = excluded.layout_json, updated_at = CURRENT_TIMESTAMP`,
        [username, JSON.stringify(layout)]
      );
    }

    if (settings && typeof settings === 'object') {
      for (const [key, val] of Object.entries(settings)) {
        await db.run(
          `INSERT INTO settings (key, value, updated_at) 
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
          [key, String(val)]
        );
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Hardware actions: Shutdown / Reboot
app.post('/api/system/action', authMiddleware, async (req: AuthRequest, res) => {
  const { action } = req.body;
  if (action !== 'reboot' && action !== 'shutdown') {
    return res.status(400).json({ success: false, error: 'Invalid system action' });
  }

  const username = req.user!.username;
  await logAudit(username, 'SYSTEM_POWER_TRIGGER', `Triggered system ${action}`);

  res.json({ success: true, message: `System is going to ${action} now.` });

  // Execute system call after short delay so response is transmitted
  setTimeout(() => {
    const cmd = action === 'reboot' ? 'sudo reboot' : 'sudo shutdown -h now';
    exec(cmd, (err) => {
      if (err) console.error(`Failed to execute ${action} trigger:`, err);
    });
  }, 1000);
});

// ----------------------------------------------------
// Serve static client bundle in production
// ----------------------------------------------------
const clientBuildDir = path.resolve('../frontend/out');
if (fs.existsSync(clientBuildDir)) {
  console.log(`Serving static client files from: ${clientBuildDir}`);
  app.use(express.static(clientBuildDir, { extensions: ['html'] }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildDir, 'index.html'));
  });
} else {
  console.warn(`Static client build folder not found at ${clientBuildDir}. API-only mode active.`);
  app.get('/', (req, res) => {
    res.json({ name: 'PiControl API Server', status: 'running', devMode: !isLinux });
  });
}

// ----------------------------------------------------
// Startup Server
// ----------------------------------------------------
const port = CONFIG.PORT;
const bindAddress = CONFIG.BIND_ADDRESS;

async function startServer() {
  await initializeDatabase();
  server.listen(port, bindAddress, () => {
    console.log(`==================================================`);
    console.log(`🚀 PiControl server is running at http://${bindAddress}:${port}`);
    console.log(`==================================================`);
  });
}

startServer().catch((e) => {
  console.error('Fatal database startup failure:', e);
});
