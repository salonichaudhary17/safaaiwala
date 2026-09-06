import {
  deletePendingAction,
  getPendingActions,
  updateOfflineLot,
  updatePendingAction,
  type OfflineLot,
  type PendingAction,
} from "./offlineStore";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

let syncRunning = false;

async function postAction(
  action: PendingAction
) {
  const response =
    await fetch(
      `${API_BASE}${getPath(
        action.type
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          action.payload
        ),
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      text ||
        `HTTP ${response.status}`
    );
  }

  return response.json();
}

function getPath(
  type: PendingAction["type"]
) {
  if (type === "CREATE_LOT") {
    return "/api/lots";
  }

  return "/api/transactions/sync";
}

async function markLotSynced(
  action: PendingAction
) {
  if (
    action.type !==
    "CREATE_LOT"
  ) {
    return;
  }

  const payload =
    action.payload as {
      clientLotId?: string;
    };

  if (!payload.clientLotId) {
    return;
  }

  const lot: OfflineLot = {
    ...(action.payload as unknown as OfflineLot),
    clientLotId:
      payload.clientLotId,
    syncStatus: "synced",
  };

  await updateOfflineLot(
    lot
  );
}

export async function flushOfflineQueue() {
  if (
    typeof navigator ===
      "undefined" ||
    !navigator.onLine ||
    syncRunning
  ) {
    return {
      synced: 0,
      failed: 0,
    };
  }

  syncRunning = true;

  let synced = 0;
  let failed = 0;

  try {
    const actions =
      await getPendingActions();

    for (const action of actions) {
      if (
        !navigator.onLine
      ) {
        break;
      }

      if (
        action.status ===
        "syncing"
      ) {
        continue;
      }

      const syncing: PendingAction =
        {
          ...action,
          status:
            "syncing",
          attempts:
            action.attempts + 1,
        };

      await updatePendingAction(
        syncing
      );

      try {
        await postAction(
          syncing
        );

        await deletePendingAction(
          syncing.id
        );

        await markLotSynced(
          syncing
        );

        synced += 1;
      } catch (error) {
        failed += 1;

        const failedAction: PendingAction =
          {
            ...syncing,
            status:
              "failed",
            lastError:
              error instanceof Error
                ? error.message
                : String(error),
          };

        await updatePendingAction(
          failedAction
        );

        if (
          !navigator.onLine
        ) {
          break;
        }
      }
    }
  } finally {
    syncRunning = false;
  }

  return {
    synced,
    failed,
  };
}

export function setupOfflineSync() {
  if (
    typeof window ===
    "undefined"
  ) {
    return () => undefined;
  }

  const handleOnline =
    () => {
      void flushOfflineQueue();
    };

  window.addEventListener(
    "online",
    handleOnline
  );

  const interval =
    window.setInterval(
      () => {
        void flushOfflineQueue();
      },
      30000
    );

  if (navigator.onLine) {
    void flushOfflineQueue();
  }

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    window.clearInterval(
      interval
    );
  };
}