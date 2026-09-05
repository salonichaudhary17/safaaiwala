import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface OfflineLot {
  clientLotId: string;
  collectorId: string;
  materialHint: string;
  weightKg: number;
  location: string;
  lat: number;
  lng: number;
  address?: string;
  hasPhoto: boolean;
  imageDataUrl?: string | null;
  description?: string;
  offlineCreated: boolean;
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  lastError?: string;
}

export interface PendingAction {
  id: string;
  type: "CREATE_LOT" | "CREATE_TRANSACTION";
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
}

export interface CachedPrice {
  key: string;
  material: string;
  location: string;
  latest: number;
  buyingPricePerKg: number;
  marketRangeMin?: number;
  marketRangeMax?: number;
  cachedAt: string;
}

interface SafaaiWalaDB extends DBSchema {
  offline_lots: {
    key: string;
    value: OfflineLot;
    indexes: {
      "by-status": string;
      "by-created": string;
    };
  };

  pending_actions: {
    key: string;
    value: PendingAction;
    indexes: {
      "by-status": string;
      "by-created": string;
    };
  };

  cached_prices: {
    key: string;
    value: CachedPrice;
  };

  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
    };
  };
}

const DB_NAME = "safaaiwala-production";
const DB_VERSION = 1;

let dbPromise:
  | Promise<IDBPDatabase<SafaaiWalaDB>>
  | null = null;

export function initOfflineDB() {
  if (!dbPromise) {
    dbPromise = openDB<SafaaiWalaDB>(
      DB_NAME,
      DB_VERSION,
      {
        upgrade(db) {
          if (
            !db.objectStoreNames.contains(
              "offline_lots"
            )
          ) {
            const store =
              db.createObjectStore(
                "offline_lots",
                {
                  keyPath:
                    "clientLotId",
                }
              );

            store.createIndex(
              "by-status",
              "syncStatus"
            );

            store.createIndex(
              "by-created",
              "createdAt"
            );
          }

          if (
            !db.objectStoreNames.contains(
              "pending_actions"
            )
          ) {
            const store =
              db.createObjectStore(
                "pending_actions",
                {
                  keyPath: "id",
                }
              );

            store.createIndex(
              "by-status",
              "status"
            );

            store.createIndex(
              "by-created",
              "createdAt"
            );
          }

          if (
            !db.objectStoreNames.contains(
              "cached_prices"
            )
          ) {
            db.createObjectStore(
              "cached_prices",
              {
                keyPath: "key",
              }
            );
          }

          if (
            !db.objectStoreNames.contains(
              "metadata"
            )
          ) {
            db.createObjectStore(
              "metadata",
              {
                keyPath: "key",
              }
            );
          }
        },
      }
    );
  }

  return dbPromise;
}

export async function saveOfflineLot(
  lot: OfflineLot
) {
  const db =
    await initOfflineDB();

  await db.put(
    "offline_lots",
    lot
  );

  return lot.clientLotId;
}

export async function getOfflineLots() {
  const db =
    await initOfflineDB();

  return db.getAll(
    "offline_lots"
  );
}

export async function updateOfflineLot(
  lot: OfflineLot
) {
  const db =
    await initOfflineDB();

  await db.put(
    "offline_lots",
    lot
  );
}

export async function queueAction(
  action: PendingAction
) {
  const db =
    await initOfflineDB();

  await db.put(
    "pending_actions",
    action
  );
}

export async function getPendingActions() {
  const db =
    await initOfflineDB();

  return db.getAllFromIndex(
    "pending_actions",
    "by-created"
  );
}

export async function updatePendingAction(
  action: PendingAction
) {
  const db =
    await initOfflineDB();

  await db.put(
    "pending_actions",
    action
  );
}

export async function deletePendingAction(
  id: string
) {
  const db =
    await initOfflineDB();

  await db.delete(
    "pending_actions",
    id
  );
}

export async function cachePrice(
  price: CachedPrice
) {
  const db =
    await initOfflineDB();

  await db.put(
    "cached_prices",
    price
  );
}

export async function getCachedPrice(
  key: string
) {
  const db =
    await initOfflineDB();

  return db.get(
    "cached_prices",
    key
  );
}

export async function setMetadata(
  key: string,
  value: unknown
) {
  const db =
    await initOfflineDB();

  await db.put(
    "metadata",
    {
      key,
      value,
    }
  );
}

export async function getMetadata<T>(
  key: string
): Promise<T | undefined> {
  const db =
    await initOfflineDB();

  const item =
    await db.get(
      "metadata",
      key
    );

  return item?.value as
    | T
    | undefined;
}