import {
  getPendingTransactions,
  removePendingTransaction,
  saveOfflineLog,
} from './offlineStore';

/**
 * Iterates over offline transactions and flushes them to the express backend.
 */
export const flushOfflineQueue = async () => {
  if (!navigator.onLine) return;

  try {
    const pending = await getPendingTransactions();
    if (!pending || pending.length === 0) return;

    for (const tx of pending) {
      try {
        const response = await fetch('/api/transactions/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tx),
        });

        if (response.ok) {
          await removePendingTransaction(tx.id);
          await saveOfflineLog({
            type: 'SYNC_SUCCESS',
            message: `Synced tx ${tx.id} successfully`,
          });
        } else {
          console.warn(`Sync failed for tx ${tx.id} with status ${response.status}`);
        }
      } catch (err) {
        console.error(`Failed to post tx ${tx.id}:`, err);
        // Stop batch execution on network drops during sync
        break;
      }
    }
  } catch (error) {
    console.error('Error during queue flush execution:', error);
  }
};

/**
 * Initializes automatic background synchronization listeners.
 */
export const setupBackgroundSync = () => {
  if (typeof window === 'undefined') return;

  // Sync on online event
  window.addEventListener('online', () => {
    saveOfflineLog({ type: 'NETWORK_CHANGE', status: 'online' });
    flushOfflineQueue();
  });

  window.addEventListener('offline', () => {
    saveOfflineLog({ type: 'NETWORK_CHANGE', status: 'offline' });
  });

  // Execute initial sync if online on app startup
  if (navigator.onLine) {
    flushOfflineQueue();
  }
};