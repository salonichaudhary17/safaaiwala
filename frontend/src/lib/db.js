import { openDB } from 'idb';

const DB_NAME = 'safaaiwala_offline_db';
const DB_VERSION = 1;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('lots')) {
        db.createObjectStore('lots', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_sync')) {
        db.createObjectStore('pending_sync', { keyPath: 'syncId', autoIncrement: true });
      }
    },
  });
}

export async function saveLotOffline(lotData) {
  const db = await initDB();
  const timestamp = new Date().toISOString();
  const payload = { ...lotData, createdAt: timestamp, synced: false };
  const id = await db.add('lots', payload);
  await db.add('pending_sync', { type: 'CREATE_LOT', data: { ...payload, id } });
  return id;
}

export async function getOfflineLots() {
  const db = await initDB();
  return db.getAll('lots');
}

export async function syncPendingData(apiSyncCallback) {
  const db = await initDB();
  const pending = await db.getAll('pending_sync');
  
  for (const item of pending) {
    try {
      await apiSyncCallback(item);
      await db.delete('pending_sync', item.syncId);
    } catch (err) {
      console.error("Sync failed for item:", item.syncId, err);
      break; // Pause synchronization on network or server error
    }
  }
}