

import type { OfflineRecordKind, OfflineTransactionRecord, SyncStatus } from "../types/ewaste";

const DB_NAME = "safaaiwala_ewaste_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_queue";
const LOCALSTORAGE_FALLBACK_KEY = "safaaiwala_ewaste_offline_queue_v1";

type QueueListener = (records: OfflineTransactionRecord[]) => void;

function generateId(): string {
  return `oq_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

/* ------------------------------------------------------------------ */
/* Low-level storage backends                                          */
/* ------------------------------------------------------------------ */

class IndexedDbBackend {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("syncStatus", "syncStatus", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    });
    return this.dbPromise;
  }

  async getAll(): Promise<OfflineTransactionRecord[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as OfflineTransactionRecord[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB getAll failed"));
    });
  }

  async put(record: OfflineTransactionRecord): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put failed"));
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    });
  }
}

class LocalStorageBackend {
  private readSafe(): OfflineTransactionRecord[] {
    try {
      const raw = window.localStorage.getItem(LOCALSTORAGE_FALLBACK_KEY);
      return raw ? (JSON.parse(raw) as OfflineTransactionRecord[]) : [];
    } catch {
      return [];
    }
  }

  private writeSafe(records: OfflineTransactionRecord[]): void {
    try {
      window.localStorage.setItem(LOCALSTORAGE_FALLBACK_KEY, JSON.stringify(records));
    } catch {
      // Storage full or unavailable — the in-memory queue in
      // OfflineQueueManager remains the source of truth for this
      // session even if persistence silently fails here.
    }
  }

  async getAll(): Promise<OfflineTransactionRecord[]> {
    return this.readSafe();
  }

  async put(record: OfflineTransactionRecord): Promise<void> {
    const records = this.readSafe();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) records[idx] = record;
    else records.push(record);
    this.writeSafe(records);
  }

  async delete(id: string): Promise<void> {
    this.writeSafe(this.readSafe().filter((r) => r.id !== id));
  }
}

/* ------------------------------------------------------------------ */
/* Public manager                                                       */
/* ------------------------------------------------------------------ */

export interface EnqueueInput<TPayload = unknown> {
  kind: OfflineRecordKind;
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH";
  payload: TPayload;
}

export interface FlushOutcome {
  attempted: number;
  synced: number;
  failed: number;
  stillPending: number;
}

export type SyncFn = (record: OfflineTransactionRecord) => Promise<boolean>;

class OfflineQueueManager {
  private backend: IndexedDbBackend | LocalStorageBackend;
  private cache: OfflineTransactionRecord[] = [];
  private listeners: Set<QueueListener> = new Set();
  private initialized = false;
  private autoSyncHandle: number | null = null;
  private autoSyncFn: SyncFn | null = null;

  constructor() {
    this.backend = isIndexedDbAvailable() ? new IndexedDbBackend() : new LocalStorageBackend();
  }

  /** Loads the persisted queue into memory. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.cache = await this.backend.getAll();
    this.initialized = true;
    this.notify();
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.cache);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener([...this.cache]);
  }

  async enqueue<TPayload>(input: EnqueueInput<TPayload>): Promise<OfflineTransactionRecord<TPayload>> {
    await this.init();
    const record: OfflineTransactionRecord<TPayload> = {
      id: generateId(),
      kind: input.kind,
      endpoint: input.endpoint,
      method: input.method ?? "POST",
      payload: input.payload,
      createdAt: new Date().toISOString(),
      syncStatus: "pending",
      retryCount: 0,
      lastAttemptAt: null,
      lastError: null,
    };
    this.cache.push(record as unknown as OfflineTransactionRecord);
    await this.backend.put(record as unknown as OfflineTransactionRecord);
    this.notify();
    return record;
  }

  async getAll(): Promise<OfflineTransactionRecord[]> {
    await this.init();
    return [...this.cache];
  }

  async getByStatus(status: SyncStatus): Promise<OfflineTransactionRecord[]> {
    await this.init();
    return this.cache.filter((r) => r.syncStatus === status);
  }

  async remove(id: string): Promise<void> {
    await this.init();
    this.cache = this.cache.filter((r) => r.id !== id);
    await this.backend.delete(id);
    this.notify();
  }

  private async updateRecord(record: OfflineTransactionRecord): Promise<void> {
    const idx = this.cache.findIndex((r) => r.id === record.id);
    if (idx >= 0) this.cache[idx] = record;
    await this.backend.put(record);
    this.notify();
  }

  /**
   * Attempts to sync every pending/failed record, in creation order,
   * using the supplied `syncFn` (typically a thin wrapper around
   * fetch() against the SafaaiWala backend). Stops attempting further
   * records for this pass once a network-level failure is detected,
   * on the assumption connectivity dropped mid-flush — this mirrors
   * the behaviour of the existing lib/offlineQueue.js trySync().
   */
  async flush(syncFn: SyncFn): Promise<FlushOutcome> {
    await this.init();
    const candidates = this.cache.filter(
      (r) => r.syncStatus === "pending" || r.syncStatus === "failed"
    );
    const outcome: FlushOutcome = { attempted: 0, synced: 0, failed: 0, stillPending: 0 };

    for (const record of candidates) {
      outcome.attempted += 1;
      const attempted: OfflineTransactionRecord = {
        ...record,
        syncStatus: "syncing",
        lastAttemptAt: new Date().toISOString(),
      };
      await this.updateRecord(attempted);

      let succeeded: boolean;
      let networkLikelyDown = false;
      try {
        succeeded = await syncFn(attempted);
      } catch (err) {
        succeeded = false;
        networkLikelyDown = true;
        attempted.lastError = err instanceof Error ? err.message : "Unknown sync error";
      }

      if (succeeded) {
        await this.remove(attempted.id);
        outcome.synced += 1;
        continue;
      }

      const failedRecord: OfflineTransactionRecord = {
        ...attempted,
        syncStatus: "failed",
        retryCount: attempted.retryCount + 1,
        lastError: attempted.lastError ?? "Server rejected the record",
      };
      await this.updateRecord(failedRecord);
      outcome.failed += 1;

      if (networkLikelyDown) {
        // Connectivity dropped mid-flush; remaining candidates are
        // still "pending" from the user's perspective, not failed.
        for (const remaining of candidates.slice(candidates.indexOf(record) + 1)) {
          outcome.stillPending += 1;
          void remaining;
        }
        break;
      }
    }

    return outcome;
  }

  /**
   * Starts an automatic flush loop: runs once immediately, then on
   * every `online` event and every `intervalMs` while online. Returns
   * a teardown function.
   */
  startAutoSync(syncFn: SyncFn, intervalMs = 30000): () => void {
    this.autoSyncFn = syncFn;
    const runIfOnline = () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      void this.flush(syncFn);
    };

    runIfOnline();
    const onlineHandler = () => runIfOnline();
    if (typeof window !== "undefined") {
      window.addEventListener("online", onlineHandler);
    }
    this.autoSyncHandle = typeof window !== "undefined"
      ? window.setInterval(runIfOnline, intervalMs)
      : null;

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onlineHandler);
        if (this.autoSyncHandle !== null) window.clearInterval(this.autoSyncHandle);
      }
      this.autoSyncHandle = null;
      this.autoSyncFn = null;
    };
  }

  isAutoSyncing(): boolean {
    return this.autoSyncFn !== null;
  }
}

/** Shared singleton — every module importing this file sees the same queue. */
export const offlineQueue = new OfflineQueueManager();

/**
 * Convenience default syncFn: POSTs a queued record's payload to
 * `${apiBaseUrl}${record.endpoint}` using `record.method`, returning
 * true on any 2xx response. Suitable for wiring straight into
 * offlineQueue.startAutoSync(makeDefaultSyncFn(API_BASE)).
 */
export function makeDefaultSyncFn(apiBaseUrl: string): SyncFn {
  return async (record: OfflineTransactionRecord): Promise<boolean> => {
    const res = await fetch(`${apiBaseUrl}${record.endpoint}`, {
      method: record.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record.payload),
    });
    return res.ok;
  };
}