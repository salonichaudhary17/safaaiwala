import Dexie from "dexie";

export const offlineDb = new Dexie("safaaiwala_offline_v2");

offlineDb.version(1).stores({
  transactions: "id, transactionId, status, synced, createdAt",
  prices: "id, materialCode, city, lastUpdated",
  receipts: "transactionId, createdAt",
  syncQueue: "++id, type, createdAt, attempts",
  classifications: "++id, materialCode, createdAt",
});

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function savePriceSnapshot(city, prices) {
  const rows = (prices || []).map((price) => ({
    id: `${price.materialCode}:${price.city || city || "all"}`,
    materialCode: price.materialCode,
    city: price.city || city || "All India",
    currentRate: price.currentRate,
    trend: price.trend,
    name: price.name,
    lastUpdated: price.lastUpdated || nowIso(),
    payload: price,
  }));

  await offlineDb.prices.bulkPut(rows);
  return rows;
}

export async function readPriceSnapshot(city) {
  if (!city) return offlineDb.prices.toArray();
  return offlineDb.prices.where("city").equals(city).toArray();
}

export async function queueClassification(result) {
  await offlineDb.classifications.add({
    ...result,
    createdAt: nowIso(),
  });
}

export async function queueTransaction(payload) {
  const id = payload.clientTransactionId || randomId("offline_tx");
  const record = {
    id,
    transactionId: payload.transactionId || id,
    status: "pending_sync",
    synced: false,
    createdAt: nowIso(),
    payload,
  };

  await offlineDb.transactions.put(record);
  await offlineDb.syncQueue.add({
    type: "CREATE_TRANSACTION",
    createdAt: nowIso(),
    attempts: 0,
    payload: { ...payload, clientTransactionId: id },
  });

  return record;
}

export async function saveReceipt(receipt) {
  if (!receipt?.transactionId) return;
  await offlineDb.receipts.put({
    ...receipt,
    createdAt: receipt.createdAt || nowIso(),
  });
}

export async function getOfflineTransactions() {
  return offlineDb.transactions.orderBy("createdAt").reverse().toArray();
}

export async function pendingSyncCount() {
  return offlineDb.syncQueue.count();
}

export async function flushSyncQueue(apiBase, token) {
  const pending = await offlineDb.syncQueue.orderBy("createdAt").toArray();
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (const item of pending) {
    try {
      const response = await fetch(`${apiBase}/api/transactions/sync`, {
        method: "POST",
        headers,
        body: JSON.stringify(item.payload),
      });

      if (!response.ok) {
        throw new Error(`sync failed ${response.status}`);
      }

      const data = await response.json();
      const transactionId =
        data.transaction?.transactionId ||
        data.transactionId ||
        item.payload.clientTransactionId;

      await offlineDb.transactions.update(item.payload.clientTransactionId, {
        synced: true,
        status: "synced",
        transactionId,
      });

      if (data.receipt) {
        await saveReceipt(data.receipt);
      }

      await offlineDb.syncQueue.delete(item.id);
    } catch (error) {
      await offlineDb.syncQueue.update(item.id, {
        attempts: (item.attempts || 0) + 1,
        lastError: error.message,
      });
      break;
    }
  }
}

export function setupOfflineSync(apiBase, getToken) {
  const run = () => {
    if (!navigator.onLine) return;
    flushSyncQueue(apiBase, getToken?.()).catch((error) => {
      console.error("Background sync failed:", error);
    });
  };

  window.addEventListener("online", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });

  run();
  return () => {
    window.removeEventListener("online", run);
  };
}

export { randomId };
