import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

dotenv.config();

// Ensure data folder exists
const dataDir = path.resolve(process.env.DATA_DIR || './data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Generate jwt secret if not specified
const envPath = path.resolve('.env');
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^JWT_SECRET=(.+)$/m);
    if (match) {
      jwtSecret = match[1].trim();
    }
  }
  
  if (!jwtSecret) {
    jwtSecret = crypto.randomBytes(32).toString('hex');
    fs.appendFileSync(envPath, `\nJWT_SECRET=${jwtSecret}\n`);
  }
}

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  BIND_ADDRESS: process.env.BIND_ADDRESS || '0.0.0.0', // Bind to all interfaces for LAN access by default
  JWT_SECRET: jwtSecret,
  DB_PATH: path.join(dataDir, 'picontrol.db'),
  SAFE_DIR: process.env.SAFE_DIR || (process.platform === 'win32' ? 'C:\\' : '/home/pi'),
  MONITOR_INTERVAL: parseInt(process.env.MONITOR_INTERVAL || '2000', 10),
  
  // Notification Thresholds
  CPU_THRESHOLD: parseInt(process.env.CPU_THRESHOLD || '80', 10), // %
  RAM_THRESHOLD: parseInt(process.env.RAM_THRESHOLD || '85', 10), // %
  TEMP_THRESHOLD: parseInt(process.env.TEMP_THRESHOLD || '70', 10), // °C (Pi warning temp starts at 80°C, throttle at 85°C)
  DISK_THRESHOLD: parseInt(process.env.DISK_THRESHOLD || '90', 10), // %
  
  IS_DEV: process.env.NODE_ENV !== 'production'
};
