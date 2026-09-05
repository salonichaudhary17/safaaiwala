import { openDB } from 'idb';

const DB_NAME = 'safaaiwala-db';
const DB_VERSION = 1;

/**
 * Initializes and upgrades IndexedDB stores for offline operation.
 */
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline transaction queue
      if (!db.objectStoreNames.contains('pending_transactions')) {
        const txStore = db.createObjectStore('pending_transactions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        txStore.createIndex('timestamp', 'timestamp');
      }

      // Cached material market rates
      if (!db.objectStoreNames.contains('cached_prices')) {
        db.createObjectStore('cached_prices', { keyPath: 'material' });
      }

      // Diagnostic and audit logs stored offline
      if (!db.objectStoreNames.contains('offline_logs')) {
        db.createObjectStore('offline_logs', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

/** Save pending transaction for later sync */
export const savePendingTransaction = async (transaction) => {
  const db = await initDB();
  return db.add('pending_transactions', {
    ...transaction,
    timestamp: new Date().toISOString(),
  });
};

/** Get all pending transactions */
export const getPendingTransactions = async () => {
  const db = await initDB();
  return db.getAll('pending_transactions');
};

/** Delete processed transaction */
export const removePendingTransaction = async (id) => {
  const db = await initDB();
  return db.delete('pending_transactions', id);
};

/** Cache latest price card array */
export const cachePrices = async (priceList) => {
  const db = await initDB();
  const tx = db.transaction('cached_prices', 'readwrite');
  for (const item of priceList) {
    await tx.store.put(item);
  }
  await tx.done;
};

/** Get cached material prices */
export const getCachedPrices = async () => {
  const db = await initDB();
  return db.getAll('cached_prices');
};

/** Append audit or system log */
export const saveOfflineLog = async (logEntry) => {
  const db = await initDB();
  return db.add('offline_logs', {
    ...logEntry,
    timestamp: new Date().toISOString(),
  });
};