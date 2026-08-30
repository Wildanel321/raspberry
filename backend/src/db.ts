import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { CONFIG } from './config';

class DatabaseConnection {
  private db!: sqlite3.Database;

  public init(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(CONFIG.DB_PATH, (err) => {
        if (err) {
          console.error('Failed to open database:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  public get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  public all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const db = new DatabaseConnection();

export async function initializeDatabase() {
  await db.init();

  // Create tables
  await db.exec(`
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
  const adminExists = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
  if (!adminExists) {
    const defaultPassword = 'admin';
    const hash = await bcrypt.hash(defaultPassword, 10);
    await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [
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

export async function logAudit(username: string, action: string, details: string) {
  try {
    await db.run('INSERT INTO audit_logs (username, action, details) VALUES (?, ?, ?)', [
      username,
      action,
      details
    ]);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
