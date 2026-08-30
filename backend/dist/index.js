"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const cors_1 = __importDefault(require("cors"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const config_1 = require("./config");
const db_1 = require("./db");
const auth_1 = require("./middleware/auth");
const MockProvider_1 = require("./providers/MockProvider");
const RaspberryPiProvider_1 = require("./providers/RaspberryPiProvider");
const telemetry_1 = require("./telemetry");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ noServer: true });
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' })); // support file uploads via JSON base64
// Determine System Provider (Mock on Win32/MacOS, RPi on Linux)
const isLinux = process.platform === 'linux';
const system = isLinux ? new RaspberryPiProvider_1.RaspberryPiProvider() : new MockProvider_1.MockProvider();
console.log(`System Provider initialized: ${isLinux ? 'RaspberryPiProvider (Linux)' : 'MockProvider (Dev Mode)'}`);
// Resolve safe path helper for file manager
function resolveSafePath(userPath) {
    const safeRoot = path_1.default.resolve(config_1.CONFIG.SAFE_DIR);
    // Clean path
    const normalizedUserPath = path_1.default.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolved = path_1.default.resolve(path_1.default.join(safeRoot, normalizedUserPath));
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
        telemetry_1.telemetryTracker.addPoint(cpu.usage, ramUsagePercent, cpu.temperature, net.downloadSpeed, net.uploadSpeed);
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
            if (cpu.usage > config_1.CONFIG.CPU_THRESHOLD) {
                await db_1.db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`CPU usage is high: ${cpu.usage}%`, 'warning']);
                triggered = true;
            }
            if (ramUsagePercent > config_1.CONFIG.RAM_THRESHOLD) {
                await db_1.db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`RAM usage is high: ${ramUsagePercent}%`, 'warning']);
                triggered = true;
            }
            if (cpu.temperature > config_1.CONFIG.TEMP_THRESHOLD) {
                const level = cpu.temperature > 80 ? 'critical' : 'warning';
                await db_1.db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`CPU temperature is high: ${cpu.temperature}°C`, level]);
                triggered = true;
            }
            if (maxDiskPercent > config_1.CONFIG.DISK_THRESHOLD) {
                await db_1.db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [`Storage partition is almost full: ${maxDiskPercent}%`, 'warning']);
                triggered = true;
            }
            if (triggered) {
                lastAlertTime = now;
            }
        }
        // Broadcast to WebSocket clients
        const dataString = JSON.stringify(metricsPayload);
        wss.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(dataString);
            }
        });
    }
    catch (error) {
        console.error('Error in telemetry poll:', error);
    }
}
// Start polling
setInterval(pollTelemetry, config_1.CONFIG.MONITOR_INTERVAL);
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
        const user = await db_1.db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user || !(await bcryptjs_1.default.compare(password, user.password_hash))) {
            // Record failed attempt
            await db_1.db.run('INSERT INTO notifications (message, level) VALUES (?, ?)', [
                `Failed login attempt for username: ${username}`,
                'warning'
            ]);
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }
        const token = (0, auth_1.signToken)({ userId: user.id, username: user.username, role: user.role });
        await (0, db_1.logAudit)(username, 'LOGIN', 'Successful user login');
        res.json({ success: true, token, user: { username: user.username, role: user.role } });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/auth/change-password', auth_1.authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Old and new passwords are required' });
    }
    try {
        const username = req.user.username;
        const user = await db_1.db.get('SELECT id, password_hash FROM users WHERE username = ?', [username]);
        if (!user || !(await bcryptjs_1.default.compare(oldPassword, user.password_hash))) {
            return res.status(401).json({ success: false, error: 'Incorrect old password' });
        }
        const hash = await bcryptjs_1.default.hash(newPassword, 10);
        await db_1.db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
        await (0, db_1.logAudit)(username, 'CHANGE_PASSWORD', 'Successfully updated account password');
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 2. Metrics History
app.get('/api/metrics/history', (req, res) => {
    const range = req.query.range || '1m';
    const history = telemetry_1.telemetryTracker.getHistory(range);
    res.json({ success: true, range, history });
});
// 3. System Info
app.get('/api/system', async (req, res) => {
    try {
        const info = await system.getSystemInfo();
        res.json({ success: true, info });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 4. Processes
app.get('/api/processes', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await system.getProcesses();
        res.json({ success: true, processes: list });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/processes/kill', auth_1.authMiddleware, async (req, res) => {
    const { pid } = req.body;
    if (!pid)
        return res.status(400).json({ success: false, error: 'PID is required' });
    try {
        const success = await system.killProcess(pid);
        await (0, db_1.logAudit)(req.user.username, 'KILL_PROCESS', `Sent kill signal to PID ${pid}`);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 5. Services
app.get('/api/services', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await system.getServices();
        res.json({ success: true, services: list });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/services/control', auth_1.authMiddleware, async (req, res) => {
    const { name, action } = req.body;
    if (!name || !action)
        return res.status(400).json({ success: false, error: 'Service name and action are required' });
    try {
        const success = await system.controlService(name, action);
        await (0, db_1.logAudit)(req.user.username, 'CONTROL_SERVICE', `Executed service action "${action}" on "${name}"`);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 6. Docker
app.get('/api/docker', auth_1.authMiddleware, async (req, res) => {
    try {
        const status = await system.getDockerStatus();
        res.json({ success: true, ...status });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/docker/control', auth_1.authMiddleware, async (req, res) => {
    const { id, action } = req.body;
    if (!id || !action)
        return res.status(400).json({ success: false, error: 'Container ID and action are required' });
    try {
        const success = await system.controlDockerContainer(id, action);
        await (0, db_1.logAudit)(req.user.username, 'CONTROL_DOCKER', `Executed container action "${action}" on container ID "${id}"`);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/docker/logs', auth_1.authMiddleware, async (req, res) => {
    const id = req.query.id;
    if (!id)
        return res.status(400).json({ success: false, error: 'Container ID is required' });
    try {
        const logs = await system.getDockerContainerLogs(id);
        res.json({ success: true, logs });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 7. GPIO
app.get('/api/gpio', auth_1.authMiddleware, async (req, res) => {
    try {
        const status = await system.getGPIOStatus();
        res.json({ success: true, gpio: status });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/gpio/toggle', auth_1.authMiddleware, async (req, res) => {
    const { pin, value } = req.body;
    if (pin === undefined || value === undefined) {
        return res.status(400).json({ success: false, error: 'Physical Pin number and Value (0 or 1) are required' });
    }
    try {
        const success = await system.toggleGPIO(pin, value);
        await (0, db_1.logAudit)(req.user.username, 'TOGGLE_GPIO', `Toggled GPIO physical pin ${pin} to value ${value}`);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/gpio/mode', auth_1.authMiddleware, async (req, res) => {
    const { pin, mode } = req.body;
    if (pin === undefined || !mode) {
        return res.status(400).json({ success: false, error: 'Physical Pin number and Mode ("in" or "out") are required' });
    }
    try {
        const success = await system.setGPIOMode(pin, mode);
        await (0, db_1.logAudit)(req.user.username, 'SET_GPIO_MODE', `Set GPIO physical pin ${pin} mode to "${mode}"`);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 8. Display
app.get('/api/display', auth_1.authMiddleware, async (req, res) => {
    try {
        const status = await system.getDisplayStatus();
        res.json({ success: true, display: status });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 9. Security
app.get('/api/security', auth_1.authMiddleware, async (req, res) => {
    try {
        const status = await system.getSecurityStatus();
        res.json({ success: true, security: status });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 10. Packages
app.get('/api/packages', auth_1.authMiddleware, async (req, res) => {
    try {
        const status = await system.getPackages();
        res.json({ success: true, packages: status });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/packages/action', auth_1.authMiddleware, async (req, res) => {
    const { action, packageName } = req.body;
    if (!action)
        return res.status(400).json({ success: false, error: 'Package action is required' });
    // Escape package name to prevent execution shell injection
    if (packageName && !/^[a-zA-Z0-9.\-_+:=]+$/.test(packageName)) {
        return res.status(400).json({ success: false, error: 'Unsafe package name characters' });
    }
    try {
        await (0, db_1.logAudit)(req.user.username, 'PACKAGE_ACTION', `Ran package action "${action}" ${packageName ? 'on ' + packageName : ''}`);
        const output = await system.runPackageAction(action, packageName);
        res.json({ success: true, output });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 11. Logs
app.get('/api/logs', auth_1.authMiddleware, async (req, res) => {
    const type = req.query.type || 'journal';
    const query = req.query.query;
    const limit = parseInt(req.query.limit, 10) || 100;
    try {
        const output = await system.getLogs(type, query, limit);
        res.json({ success: true, logs: output });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 12. File Manager (Traversal Protected)
app.get('/api/files', auth_1.authMiddleware, (req, res) => {
    const reqPath = req.query.path || '';
    const result = resolveSafePath(reqPath);
    if (!result.success) {
        return res.status(403).json({ success: false, error: result.error });
    }
    try {
        const files = fs_1.default.readdirSync(result.resolvedPath);
        const details = files.map((file) => {
            const fullPath = path_1.default.join(result.resolvedPath, file);
            const stat = fs_1.default.statSync(fullPath);
            return {
                name: file,
                isDirectory: stat.isDirectory(),
                size: stat.size,
                modified: stat.mtime.toISOString(),
                permissions: '0' + (stat.mode & 0o777).toString(8)
            };
        });
        res.json({ success: true, files: details, currentPath: path_1.default.relative(config_1.CONFIG.SAFE_DIR, result.resolvedPath) || '/' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/files/create', auth_1.authMiddleware, (req, res) => {
    const { path: reqPath, folderName } = req.body;
    if (!folderName)
        return res.status(400).json({ success: false, error: 'Folder name is required' });
    // Escape dangerous folder names
    if (folderName.includes('/') || folderName.includes('\\') || folderName.includes('..')) {
        return res.status(400).json({ success: false, error: 'Invalid folder name' });
    }
    const result = resolveSafePath(reqPath || '');
    if (!result.success) {
        return res.status(403).json({ success: false, error: result.error });
    }
    try {
        const newFolderPath = path_1.default.join(result.resolvedPath, folderName);
        fs_1.default.mkdirSync(newFolderPath);
        res.json({ success: true, message: 'Folder created successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/files/upload', auth_1.authMiddleware, (req, res) => {
    const { path: reqPath, filename, content } = req.body; // content is base64 string
    if (!filename || !content)
        return res.status(400).json({ success: false, error: 'Filename and base64 content are required' });
    const result = resolveSafePath(reqPath || '');
    if (!result.success) {
        return res.status(403).json({ success: false, error: result.error });
    }
    try {
        const targetFilePath = path_1.default.join(result.resolvedPath, filename);
        const buffer = Buffer.from(content, 'base64');
        fs_1.default.writeFileSync(targetFilePath, buffer);
        res.json({ success: true, message: 'File uploaded successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/files/download', auth_1.authMiddleware, (req, res) => {
    const filePath = req.query.path;
    if (!filePath)
        return res.status(400).json({ success: false, error: 'File path is required' });
    const result = resolveSafePath(filePath);
    if (!result.success) {
        return res.status(403).json({ success: false, error: result.error });
    }
    if (!fs_1.default.existsSync(result.resolvedPath) || fs_1.default.statSync(result.resolvedPath).isDirectory()) {
        return res.status(404).json({ success: false, error: 'File not found' });
    }
    res.sendFile(result.resolvedPath);
});
app.post('/api/files/rename', auth_1.authMiddleware, (req, res) => {
    const { path: folderPath, oldName, newName } = req.body;
    if (!oldName || !newName)
        return res.status(400).json({ success: false, error: 'Old name and new name are required' });
    // Prevent parent traversal in filename itself
    if (newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
        return res.status(400).json({ success: false, error: 'Invalid file name' });
    }
    const result = resolveSafePath(folderPath || '');
    if (!result.success) {
        return res.status(403).json({ success: false, error: result.error });
    }
    try {
        const oldPath = path_1.default.join(result.resolvedPath, oldName);
        const newPath = path_1.default.join(result.resolvedPath, newName);
        if (!fs_1.default.existsSync(oldPath)) {
            return res.status(404).json({ success: false, error: 'Source file does not exist' });
        }
        fs_1.default.renameSync(oldPath, newPath);
        res.json({ success: true, message: 'Item renamed successfully' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 13. Terminal Allowlist Runner
app.post('/api/terminal/exec', auth_1.authMiddleware, async (req, res) => {
    const { command } = req.body;
    if (!command)
        return res.status(400).json({ success: false, error: 'Command string is required' });
    const username = req.user.username;
    // 1. Strict input characters whitelist to block chaining/injections
    if (/[;&|$`><\n\r()]/g.test(command)) {
        await (0, db_1.logAudit)(username, 'TERMINAL_REJECTED', `Rejected malicious input: "${command}"`);
        return res.status(403).json({ success: false, error: 'Access Denied: Unsafe characters detected.' });
    }
    // 2. Parse command arguments
    const args = command.trim().split(/\s+/);
    const baseCmd = args[0];
    const allowedBase = ['uptime', 'uname', 'df', 'free', 'lsblk', 'ip', 'ss', 'systemctl', 'journalctl', 'ping', 'host', 'traceroute', 'route'];
    if (!allowedBase.includes(baseCmd)) {
        return res.status(403).json({ success: false, error: `Access Denied: Base command "${baseCmd}" is not allowed.` });
    } // 3. For systemctl and journalctl, we only allow status / viewing operations
    if (baseCmd === 'systemctl') {
        const action = args[1];
        if (action && action !== 'status') {
            return res.status(403).json({ success: false, error: `Access Denied: "systemctl" is limited to "status" queries in the terminal.` });
        }
    }
    // Log in Audit Log
    await (0, db_1.logAudit)(username, 'TERMINAL_EXEC', `Ran command: "${command}"`);
    // 4. Exec safely
    // Prefix journalctl, systemctl, etc. with sudo if on Pi and we want access to all logs,
    // but to keep it simple, we run command exactly as typed. Since picontrol is passwordless for systemctl, it will work.
    (0, child_process_1.exec)(command, { timeout: 10000 }, (error, stdout, stderr) => {
        res.json({
            success: true,
            output: (stdout + stderr).trim() || '(No output)'
        });
    });
});
// 14. Notifications API
app.get('/api/notifications', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.all('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50');
        res.json({ success: true, notifications: list });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/notifications/dismiss', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.body;
    try {
        if (id) {
            await db_1.db.run('UPDATE notifications SET dismissed = 1 WHERE id = ?', [id]);
        }
        else {
            await db_1.db.run('UPDATE notifications SET dismissed = 1');
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 15. Audit Logs
app.get('/api/audit-logs', auth_1.authMiddleware, async (req, res) => {
    try {
        const list = await db_1.db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100');
        res.json({ success: true, auditLogs: list });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 16. Layout & Settings API
app.get('/api/settings', auth_1.authMiddleware, async (req, res) => {
    try {
        const layoutRow = await db_1.db.get('SELECT layout_json FROM dashboard_layout WHERE username = ?', [req.user.username]);
        // Fetch notifications settings thresholds or other metadata
        const dbSettings = await db_1.db.all('SELECT * FROM settings');
        const settingsMap = {};
        dbSettings.forEach((s) => {
            settingsMap[s.key] = s.value;
        });
        res.json({
            success: true,
            layout: layoutRow ? JSON.parse(layoutRow.layout_json) : null,
            settings: settingsMap
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/settings', auth_1.authMiddleware, async (req, res) => {
    const { layout, settings } = req.body;
    const username = req.user.username;
    try {
        if (layout) {
            await db_1.db.run(`INSERT INTO dashboard_layout (username, layout_json, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(username) DO UPDATE SET layout_json = excluded.layout_json, updated_at = CURRENT_TIMESTAMP`, [username, JSON.stringify(layout)]);
        }
        if (settings && typeof settings === 'object') {
            for (const [key, val] of Object.entries(settings)) {
                await db_1.db.run(`INSERT INTO settings (key, value, updated_at) 
           VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`, [key, String(val)]);
            }
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// 17. Hardware actions: Shutdown / Reboot
app.post('/api/system/action', auth_1.authMiddleware, async (req, res) => {
    const { action } = req.body;
    if (action !== 'reboot' && action !== 'shutdown') {
        return res.status(400).json({ success: false, error: 'Invalid system action' });
    }
    const username = req.user.username;
    await (0, db_1.logAudit)(username, 'SYSTEM_POWER_TRIGGER', `Triggered system ${action}`);
    res.json({ success: true, message: `System is going to ${action} now.` });
    // Execute system call after short delay so response is transmitted
    setTimeout(() => {
        const cmd = action === 'reboot' ? 'sudo reboot' : 'sudo shutdown -h now';
        (0, child_process_1.exec)(cmd, (err) => {
            if (err)
                console.error(`Failed to execute ${action} trigger:`, err);
        });
    }, 1000);
});
// ----------------------------------------------------
// Serve static client bundle in production
// ----------------------------------------------------
const clientBuildDir = path_1.default.resolve('../frontend/out');
if (fs_1.default.existsSync(clientBuildDir)) {
    console.log(`Serving static client files from: ${clientBuildDir}`);
    app.use(express_1.default.static(clientBuildDir, { extensions: ['html'] }));
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(clientBuildDir, 'index.html'));
    });
}
else {
    console.warn(`Static client build folder not found at ${clientBuildDir}. API-only mode active.`);
    app.get('/', (req, res) => {
        res.json({ name: 'PiControl API Server', status: 'running', devMode: !isLinux });
    });
}
// ----------------------------------------------------
// Startup Server
// ----------------------------------------------------
const port = config_1.CONFIG.PORT;
const bindAddress = config_1.CONFIG.BIND_ADDRESS;
async function startServer() {
    await (0, db_1.initializeDatabase)();
    server.listen(port, bindAddress, () => {
        console.log(`==================================================`);
        console.log(`🚀 PiControl server is running at http://${bindAddress}:${port}`);
        console.log(`==================================================`);
    });
}
startServer().catch((e) => {
    console.error('Fatal database startup failure:', e);
});
