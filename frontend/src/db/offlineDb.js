import Dexie from 'dexie';

export const db = new Dexie('SafaaiwalaOfflineDB');

db.version(1).stores({
  offlineTransactions: '++id, itemsList, totalAmount, syncStatus, createdAt',
  cachedPrices: '++id, material, category, currentRate, trend, lastCached'
});

// Helper for offline queueing
export const queueOfflineTransaction = async (transactionData) => {
  return await db.offlineTransactions.add({
    ...transactionData,
    syncStatus: 'pending',
    createdAt: new Date().toISOString()
  });
};

// Sync offline transactions when online
export const syncOfflineData = async (apiEndpoint) => {
  const pendingTxns = await db.offlineTransactions.where('syncStatus').equals('pending').toArray();

  for (const txn of pendingTxns) {
    try {
      const response = await fetch(`${apiEndpoint}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txn)
      });
      if (response.ok) {
        await db.offlineTransactions.update(txn.id, { syncStatus: 'synced' });
      }
    } catch (err) {
      console.error('Offline sync failed for item:', txn.id, err);
    }
  }
};
