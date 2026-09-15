const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'bluetooth.db');

let db;

function initDb() {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');

      db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mac_address TEXT NOT NULL,
          device_name TEXT,
          device_type TEXT DEFAULT 'unknown',
          rssi INTEGER,
          is_ble INTEGER DEFAULT 0,
          manufacturer_data TEXT,
          service_uuids TEXT,
          first_seen TEXT NOT NULL,
          last_seen TEXT NOT NULL,
          scanner_id TEXT,
          location_lat REAL,
          location_lng REAL,
          UNIQUE(mac_address, scanner_id)
        );

        CREATE TABLE IF NOT EXISTS scan_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scanner_id TEXT NOT NULL,
          device_mac TEXT NOT NULL,
          device_name TEXT,
          rssi INTEGER,
          is_ble INTEGER DEFAULT 0,
          timestamp TEXT NOT NULL,
          location_lat REAL,
          location_lng REAL
        );

        CREATE TABLE IF NOT EXISTS alerts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scanner_id TEXT NOT NULL,
          mac_address TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          message TEXT,
          timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          scanner_id TEXT NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          extra TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address);
        CREATE INDEX IF NOT EXISTS idx_scan_events_scanner ON scan_events(scanner_id);
        CREATE INDEX IF NOT EXISTS idx_scan_events_timestamp ON scan_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_scanner ON app_logs(scanner_id);
      `);

      console.log('Database initialized at', DB_PATH);
      resolve(db);
    } catch (err) {
      reject(err);
    }
  });
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initDb, getDb };
