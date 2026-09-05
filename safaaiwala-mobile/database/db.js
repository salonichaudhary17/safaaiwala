import { Platform } from 'react-native';

let dbInstance = null;
let SQLite = null;

// Only import native SQLite on iOS and Android
if (Platform.OS !== 'web') {
  try {
    SQLite = require('expo-sqlite');
  } catch (e) {
    console.warn('Native SQLite module not available, falling back to storage:', e);
  }
}

/**
 * Initializes database.
 * On Native (Android/iOS): Uses expo-sqlite.
 * On Web: Uses localStorage offline storage.
 */
export async function initDatabase() {
  if (Platform.OS === 'web' || !SQLite) {
    console.log('[Storage] Using web localStorage for offline lots');
    if (!localStorage.getItem('safaaiwala_offline_lots')) {
      localStorage.setItem('safaaiwala_offline_lots', JSON.stringify([]));
    }
    return true;
  }

  try {
    if (SQLite.openDatabaseAsync) {
      dbInstance = await SQLite.openDatabaseAsync('safaaiwala_offline.db');
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_lots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          collector_id TEXT,
          category TEXT,
          weight_kg REAL,
          estimated_value REAL,
          safety_warning TEXT,
          handover_hash TEXT UNIQUE,
          status TEXT,
          created_at TEXT,
          synced INTEGER DEFAULT 0
        );
      `);
      console.log('[SQLite] offline_lots table initialized (Async API)');
    } else {
      dbInstance = SQLite.openDatabase('safaaiwala_offline.db');
      await new Promise((resolve, reject) => {
        dbInstance.transaction(
          (tx) => {
            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS offline_lots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collector_id TEXT,
                category TEXT,
                weight_kg REAL,
                estimated_value REAL,
                safety_warning TEXT,
                handover_hash TEXT UNIQUE,
                status TEXT,
                created_at TEXT,
                synced INTEGER DEFAULT 0
              );
            `);
          },
          reject,
          resolve
        );
      });
      console.log('[SQLite] offline_lots table initialized (Legacy API)');
    }
    return dbInstance;
  } catch (error) {
    console.error('[SQLite Init Error]:', error);
    return null;
  }
}

export async function saveOfflineLot(lot) {
  const timestamp = lot.created_at || new Date().toISOString();
  const hash = lot.handover_hash || `offline_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  if (Platform.OS === 'web' || !SQLite) {
    try {
      const stored = JSON.parse(localStorage.getItem('safaaiwala_offline_lots') || '[]');
      const newRecord = {
        id: Date.now(),
        collector_id: lot.collector_id || 'collector-web',
        category: lot.category,
        weight_kg: lot.weight_kg,
        estimated_value: lot.estimated_value,
        safety_warning: lot.safety_warning,
        handover_hash: hash,
        status: lot.status || 'saved_offline',
        created_at: timestamp,
        synced: 0
      };
      stored.unshift(newRecord);
      localStorage.setItem('safaaiwala_offline_lots', JSON.stringify(stored));
      return newRecord;
    } catch (e) {
      console.error('Web storage error:', e);
      throw e;
    }
  }

  if (!dbInstance) await initDatabase();

  if (dbInstance?.runAsync) {
    const result = await dbInstance.runAsync(
      `INSERT INTO offline_lots (collector_id, category, weight_kg, estimated_value, safety_warning, handover_hash, status, created_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        lot.collector_id || 'collector-offline',
        lot.category,
        lot.weight_kg,
        lot.estimated_value,
        lot.safety_warning,
        hash,
        lot.status || 'saved_offline',
        timestamp
      ]
    );
    return { id: result.lastInsertRowId, ...lot, handover_hash: hash, created_at: timestamp };
  } else {
    return new Promise((resolve, reject) => {
      dbInstance.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT INTO offline_lots (collector_id, category, weight_kg, estimated_value, safety_warning, handover_hash, status, created_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
            [
              lot.collector_id || 'collector-offline',
              lot.category,
              lot.weight_kg,
              lot.estimated_value,
              lot.safety_warning,
              hash,
              lot.status || 'saved_offline',
              timestamp
            ],
            (_, result) => {
              resolve({ id: result.insertId, ...lot, handover_hash: hash, created_at: timestamp });
            },
            (_, err) => {
              reject(err);
              return false;
            }
          );
        },
        reject
      );
    });
  }
}

export async function getOfflineLots() {
  if (Platform.OS === 'web' || !SQLite) {
    try {
      return JSON.parse(localStorage.getItem('safaaiwala_offline_lots') || '[]');
    } catch (e) {
      return [];
    }
  }

  if (!dbInstance) await initDatabase();

  if (dbInstance?.getAllAsync) {
    return await dbInstance.getAllAsync('SELECT * FROM offline_lots ORDER BY id DESC;');
  } else if (dbInstance) {
    return new Promise((resolve, reject) => {
      dbInstance.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM offline_lots ORDER BY id DESC;',
            [],
            (_, { rows }) => resolve(rows._array || []),
            (_, err) => {
              reject(err);
              return false;
            }
          );
        },
        reject
      );
    });
  }
  return [];
}
