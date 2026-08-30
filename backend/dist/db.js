"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initializeDatabase = initializeDatabase;
exports.logAudit = logAudit;
const sqlite3_1 = __importDefault(require("sqlite3"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("./config");
class DatabaseConnection {
    db;
    init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3_1.default.Database(config_1.CONFIG.DB_PATH, (err) => {
                if (err) {
                    console.error('Failed to open database:', err);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    exec(sql) {
        return new Promise((resolve, reject) => {
            this.db.exec(sql, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
}
exports.db = new DatabaseConnection();
async function initializeDatabase() {
    await exports.db.init();
    // Create tables
    await exports.db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      level TEXT NOT NULL, -- 'info', 'warning', 'critical'
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      dismissed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dashboard_layout (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      layout_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
    // Insert default admin user if none exists
    const adminExists = await exports.db.get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminExists) {
        const defaultPassword = 'admin';
        const hash = await bcryptjs_1.default.hash(defaultPassword, 10);
        await exports.db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [
            'admin',
            hash,
            'admin'
        ]);
        console.log('==================================================');
        console.log('PiControl initialized!');
        console.log('Created default user credentials:');
        console.log('  Username: admin');
        console.log('  Password: admin');
        console.log('👉 PLEASE CHANGE THE PASSWORD IN SETTINGS PAGE 👈');
        console.log('==================================================');
        // Add default log
        await logAudit('system', 'INITIALIZE', 'Database initialized and default admin user created');
    }
}
async function logAudit(username, action, details) {
    try {
        await exports.db.run('INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)', [
            username,
            action,
            details
        ]);
    }
    catch (error) {
        console.error('Failed to log audit event:', error);
    }
}
