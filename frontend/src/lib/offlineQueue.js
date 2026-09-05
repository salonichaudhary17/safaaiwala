const QUEUE_KEY = "safaaiwala_pending_actions";

export function enqueue(action) {
  const queue = getQueue();
  queue.push({ ...action, queuedAt: new Date().toISOString(), id: `q_${Date.now()}` });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function removeFromQueue(id) {
  const queue = getQueue().filter((q) => q.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * trySync - replays queued POST actions against the API in order.
 * Call this on window 'online' events and on app start.
 */
export async function trySync(apiBaseUrl) {
  const queue = getQueue();
  const results = [];
  for (const action of queue) {
    try {
      const res = await fetch(`${apiBaseUrl}${action.path}`, {
        method: action.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });
      if (res.ok) {
        removeFromQueue(action.id);
        results.push({ id: action.id, status: "synced" });
      } else {
        results.push({ id: action.id, status: "failed" });
      }
    } catch {
      // still offline, stop trying further items this pass
      break;
    }
  }
  return results;
}

// Simple GET response cache for offline reads (price list, recycler list, materials)
export function cacheGet(key, data) {
  localStorage.setItem(`safaaiwala_cache_${key}`, JSON.stringify(data));
}

export function readCache(key) {
  try {
    return JSON.parse(localStorage.getItem(`safaaiwala_cache_${key}`));
  } catch {
    return null;
  }
}
