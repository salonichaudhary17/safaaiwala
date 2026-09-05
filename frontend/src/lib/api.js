import { enqueue, cacheGet, readCache } from "./offlineQueue";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function getJson(path, cacheKey) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    const data = await res.json();
    if (cacheKey) cacheGet(cacheKey, data);
    return data;
  } catch (err) {
    if (cacheKey) {
      const cached = readCache(cacheKey);
      if (cached) return cached;
    }
    throw err;
  }
}

export const getMaterials = () => getJson("/api/materials", "materials");

export const getPrice = (materialId, location) =>
  getJson(
    `/api/price?material=${materialId}&location=${encodeURIComponent(location)}`,
    `price_${materialId}_${location}`
  );

export const getRecyclerMatch = (materialId, lat, lng) =>
  getJson(
    `/api/recyclers/match?material=${materialId}&lat=${lat}&lng=${lng}`,
    `match_${materialId}`
  );

export async function createLot(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/lots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    // Lot pricing needs live-ish data, so we don't queue this one silently —
    // surface the failure and let the UI fall back to cached price display.
    throw err;
  }
}

export async function createTransaction(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("failed");
    return { ...(await res.json()), queued: false };
  } catch {
    enqueue({ path: "/api/transactions", method: "POST", body: payload });
    return { ...payload, queued: true, status: "pending_sync" };
  }
}

export const getLedger = (collectorId) =>
  getJson(`/api/ledger/${collectorId}`, `ledger_${collectorId}`);

export async function askAssistant(text, lang, location) {
  const res = await fetch(`${API_BASE}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang, location }),
  });
  return res.json();
}
