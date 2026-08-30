"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
// Ensure data folder exists
const dataDir = path_1.default.resolve(process.env.DATA_DIR || './data');
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
// Generate jwt secret if not specified
const envPath = path_1.default.resolve('.env');
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    if (fs_1.default.existsSync(envPath)) {
        const envContent = fs_1.default.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^JWT_SECRET=(.+)$/m);
        if (match) {
            jwtSecret = match[1].trim();
        }
    }
    if (!jwtSecret) {
        jwtSecret = crypto_1.default.randomBytes(32).toString('hex');
        fs_1.default.appendFileSync(envPath, `\nJWT_SECRET=${jwtSecret}\n`);
    }
}
exports.CONFIG = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    BIND_ADDRESS: process.env.BIND_ADDRESS || '0.0.0.0', // Bind to all interfaces for LAN access by default
    JWT_SECRET: jwtSecret,
    DB_PATH: path_1.default.join(dataDir, 'picontrol.db'),
    SAFE_DIR: process.env.SAFE_DIR || (process.platform === 'win32' ? 'C:\\' : '/home/pi'),
    MONITOR_INTERVAL: parseInt(process.env.MONITOR_INTERVAL || '2000', 10),
    // Notification Thresholds
    CPU_THRESHOLD: parseInt(process.env.CPU_THRESHOLD || '80', 10), // %
    RAM_THRESHOLD: parseInt(process.env.RAM_THRESHOLD || '85', 10), // %
    TEMP_THRESHOLD: parseInt(process.env.TEMP_THRESHOLD || '70', 10), // °C (Pi warning temp starts at 80°C, throttle at 85°C)
    DISK_THRESHOLD: parseInt(process.env.DISK_THRESHOLD || '90', 10), // %
    IS_DEV: process.env.NODE_ENV !== 'production'
};
